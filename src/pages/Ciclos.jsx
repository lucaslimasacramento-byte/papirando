import React from 'react';
import {
  CalendarDays,
  Clock,
  HelpCircle,
  ListOrdered,
  Play,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

const CYCLE_PASTEL_COLORS = Array.from(
  new Set([
    '#FFD1DC',
    '#FFB3BA',
    '#FFDFBA',
    '#FFFFBA',
    '#BAFFC9',
    '#BAE1FF',
    '#D7BAFF',
    '#FFCCE5',
    '#CCE5FF',
    '#E5FFCC',
    '#FADADD',
    '#D6EAF8',
    '#D5F5E3',
    '#FCF3CF',
    '#EBDEF0',
    '#F9E79F',
    '#AED6F1',
    '#A9DFBF',
    '#F5CBA7',
    '#F1948A',
    '#BB8FCE',
    '#85C1E9',
    '#73C6B6',
    '#F7DC6F',
    '#F8C471',
    '#E59866',
    '#D98880',
    '#C39BD3',
    '#7FB3D5',
    '#76D7C4',
    '#FAD7A0',
    '#F5B7B1',
    '#E8DAEF',
    '#D4E6F1',
    '#D1F2EB',
    '#FDEBD0',
    '#FADBD8',
    '#EAF2F8',
    '#E8F8F5',
    '#FEF9E7',
    '#FDEDEC',
    '#EBF5FB',
    '#E9F7EF',
    '#FDF2E9',
    '#F5EEF8',
    '#D6DBDF',
    '#A3E4D7',
    '#F9EBEA',
    '#EAFAF1',
  ])
);

const CHART_CENTER = 60;
const OUTER_RING_OUTER_RADIUS = 54;
const OUTER_RING_INNER_RADIUS = 37.2;
const INNER_RING_OUTER_RADIUS = 36.3;
const INNER_RING_INNER_RADIUS = 23.8;

export default function Ciclos({
  planWizardStep = 0,
  setPlanWizardStep = () => {},
  isEditingCycle = false,
  setIsEditingCycle = () => {},
  wizData = {},
  setWizData = () => {},
  bancoDisciplinas = [],
  toggleWizMateria = () => {},
  handlePesoChange = () => {},
  totalWeightPreview = 0,
  minConcluidosCiclo = 0,
  totMinutosCiclo = 0,
  progressoCiclo = 0,
  showFinishedSessions = true,
  setShowFinishedSessions = () => {},
  activeCycle = [],
  toggleSessionConcluida = () => {},
  openTimerSetup = () => {},
  setRegistroEstudoModalOpen = () => {},
  donutData = [],
  setChartTooltip = () => {},
  formatTimeStr = (mins) => formatMinutes(mins),
  onResetCycle = () => {},
  onFinalizeCycle = () => {},
  embedded = false,
}) {
  const safeDisciplines = React.useMemo(
    () =>
      (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [])
        .filter(Boolean)
        .map((discipline, index, list) => ({
          ...discipline,
          cor: buildDistinctPastelColor(index, list.length || 1),
        })),
    [bancoDisciplinas]
  );

  const safeWizData = React.useMemo(
    () => ({
      tipo: 'ciclo',
      materias: [],
      pesos: {},
      horasSemana: 18,
      minSessao: '1h 30m',
      maxSessao: '2h 00m',
      ...wizData,
    }),
    [wizData]
  );

  const selectedIds = React.useMemo(
    () => (Array.isArray(safeWizData.materias) ? safeWizData.materias : []).map((item) => String(item)),
    [safeWizData.materias]
  );

  const getSourceIds = React.useCallback((discipline) => {
    if (Array.isArray(discipline?.sourceIds) && discipline.sourceIds.length > 0) {
      return discipline.sourceIds.map((item) => String(item));
    }
    if (discipline?.id !== undefined && discipline?.id !== null) {
      return [String(discipline.id)];
    }
    return [];
  }, []);

  const getWeightKey = React.useCallback(
    (discipline) => String(discipline?.canonicalName || discipline?.nome || discipline?.id || ''),
    []
  );

  const getMatterKey = React.useCallback(
    (entry) => String(entry?.canonicalName || entry?.materia || entry?.nome || entry?.id || ''),
    []
  );

  const isSelected = React.useCallback(
    (discipline) => {
      const sourceIds = getSourceIds(discipline);
      if (sourceIds.length === 0) return false;
      return sourceIds.every((item) => selectedIds.includes(item));
    },
    [getSourceIds, selectedIds]
  );

  const selectedSubjects = React.useMemo(
    () => safeDisciplines.filter((discipline) => isSelected(discipline)),
    [safeDisciplines, isSelected]
  );

  const previewWeightTotal = React.useMemo(() => {
    if (Number(totalWeightPreview || 0) > 0) return Number(totalWeightPreview || 0);
    return selectedSubjects.reduce((acc, discipline) => {
      const key = getWeightKey(discipline);
      const current = safeWizData.pesos?.[key] || { imp: 5, con: 1.5 };
      return acc + Number(current.imp || 5) * (6 - Number(current.con || 1.5));
    }, 0);
  }, [selectedSubjects, safeWizData.pesos, getWeightKey, totalWeightPreview]);

  const subjectColorMap = React.useMemo(() => {
    const sourceEntries = (Array.isArray(activeCycle) ? activeCycle : [])
      .filter(Boolean)
      .map((entry) => getMatterKey(entry))
      .filter(Boolean);
    const uniqueKeys = [...new Set(sourceEntries)];
    return new Map(
      uniqueKeys.map((key, index) => [
        key,
        buildDistinctPastelColor(index, uniqueKeys.length || 1),
      ])
    );
  }, [activeCycle, getMatterKey]);

  const safeCycle = React.useMemo(
    () =>
      (Array.isArray(activeCycle) ? activeCycle : [])
        .filter(Boolean)
        .map((item, index) => {
          const matterKey = getMatterKey(item) || `cycle-${index}`;
          return {
            ...item,
            cor: subjectColorMap.get(matterKey) || buildDistinctPastelColor(index, Math.max(activeCycle.length, 1)),
          };
        }),
    [activeCycle, getMatterKey, subjectColorMap]
  );

  const groupedSubjects = React.useMemo(() => {
    const source = safeCycle.length > 0 ? safeCycle : (Array.isArray(donutData) ? donutData.filter(Boolean) : []);
    const groups = new Map();

    source.forEach((item, index) => {
      const matterKey = getMatterKey(item) || `subject-${index}`;
      if (!groups.has(matterKey)) {
        groups.set(matterKey, {
          key: matterKey,
          materia: item?.materia || item?.nome || `Matéria ${index + 1}`,
          cor: subjectColorMap.get(matterKey) || buildDistinctPastelColor(groups.size, source.length || 1),
          minutos: 0,
          blocos: [],
          order: index,
        });
      }

      const group = groups.get(matterKey);
      group.minutos += Number(item?.minutos || 0);
      group.blocos.push({
        ...item,
        cor: group.cor,
        blocoVisual: group.blocos.length + 1,
      });
    });

    return Array.from(groups.values()).sort((first, second) => first.order - second.order);
  }, [safeCycle, donutData, getMatterKey, subjectColorMap]);

  const innerSegments = React.useMemo(() => buildInnerCycleSegments(groupedSubjects), [groupedSubjects]);

  const outerSegments = React.useMemo(() => buildOuterCycleSegments(groupedSubjects), [groupedSubjects]);

  const filteredCycle = safeCycle.filter((item) => showFinishedSessions || !item.concluido);
  const completedCycles = progressoCiclo >= 100 && Number(totMinutosCiclo || 0) > 0 ? 1 : 0;

  if (planWizardStep > 0) {
    return (
      <div className={`${embedded ? 'flex min-h-0 flex-col gap-6' : 'mx-auto flex max-w-[1400px] min-h-0 flex-col gap-6'} animate-in fade-in duration-500`}>
        <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <div className="relative mx-auto mb-12 flex max-w-2xl items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-1 -translate-y-1/2 rounded-full bg-gray-100" />
            <div className="absolute left-0 top-1/2 -z-10 h-1 -translate-y-1/2 rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${((planWizardStep - 1) / 3) * 100}%` }} />
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-sm font-black transition-colors ${planWizardStep >= step ? 'bg-[#2563EB] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                  {String(step).padStart(2, '0')}
                </div>
                <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${planWizardStep >= step ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                  {step === 1 ? 'Organização' : step === 2 ? 'Disciplinas' : step === 3 ? 'Relevância' : 'Horários'}
                </span>
              </div>
            ))}
          </div>

          {planWizardStep === 1 ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 text-center">
                <p className="font-semibold text-gray-500">Para iniciar o seu planejamento, escolha a melhor forma de visualização para você:</p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <WizardModeCard title="Ciclo de Estudos" description="Estude as disciplinas em uma ordem rotativa, sem depender de dias fixos. Ideal para quem precisa de flexibilidade na rotina." icon={RefreshCw} selected={safeWizData.tipo === 'ciclo'} onClick={() => { setWizData((prev) => ({ ...prev, tipo: 'ciclo' })); setPlanWizardStep(2); }} />
                <WizardModeCard title="Planejamento Semanal" description="Define quais matérias estudar em cada dia da semana. Ótimo para quem prefere uma rotina fixa e estruturada." icon={CalendarDays} selected={safeWizData.tipo === 'semanal'} onClick={() => { setWizData((prev) => ({ ...prev, tipo: 'semanal' })); setPlanWizardStep(2); }} />
              </div>
            </div>
          ) : null}

          {planWizardStep === 2 ? (
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <p className="font-semibold text-gray-500">Selecione quais das <strong className="text-gray-800">suas disciplinas</strong> deseja colocar no seu <strong className="text-gray-800">planejamento</strong>.</p>
              </div>
              <div className="mb-10 rounded-[2rem] border border-gray-200 bg-gray-50 p-6 md:p-8">
                <div className="grid max-h-[320px] grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar md:grid-cols-3">
                  {safeDisciplines.map((discipline) => (
                    <button key={getWeightKey(discipline)} type="button" onClick={() => toggleWizMateria(discipline)} className={`truncate rounded-xl border-2 px-4 py-3.5 text-center text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 ${isSelected(discipline) ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      {discipline.nome}
                    </button>
                  ))}
                </div>
              </div>
              <WizardFooter onBack={() => setPlanWizardStep(1)} onNext={() => setPlanWizardStep(3)} nextDisabled={selectedSubjects.length === 0} />
            </div>
          ) : null}

          {planWizardStep === 3 ? (
            <div className="mx-auto max-w-5xl">
              <div className="mb-8 text-center">
                <p className="font-semibold text-gray-500">Para cada disciplina, selecione a <strong className="text-gray-800">importância</strong> e o seu <strong className="text-gray-800">grau de conhecimento</strong>.</p>
              </div>
              <div className="mb-10 flex flex-col gap-8 lg:flex-row">
                <div className="grid max-h-[450px] flex-1 grid-cols-1 gap-6 overflow-y-auto pr-2 custom-scrollbar md:grid-cols-2">
                  {selectedSubjects.map((discipline) => {
                    const key = getWeightKey(discipline);
                    const currentPeso = safeWizData.pesos?.[key] || { imp: 5, con: 1.5 };
                    return (
                      <div key={key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-[#2563EB]/30">
                        <h4 className="mb-6 text-center font-bold text-gray-800">{discipline.nome}</h4>
                        <div className="space-y-6">
                          <SliderRow label="Importância" value={Number(currentPeso.imp || 5)} max={5} step={1} onChange={(value) => handlePesoChange(discipline, 'imp', value)} />
                          <SliderRow label="Conhecimento" value={Number(currentPeso.con || 1.5)} max={5} step={0.5} onChange={(value) => handlePesoChange(discipline, 'con', value)} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full shrink-0 rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:w-72">
                  <h4 className="mb-4 border-b border-gray-200 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Pré-visualização do ciclo</h4>
                  <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedSubjects.map((discipline, index) => {
                      const key = getWeightKey(discipline);
                      const currentPeso = safeWizData.pesos?.[key] || { imp: 5, con: 1.5 };
                      const weight = Number(currentPeso.imp || 5) * (6 - Number(currentPeso.con || 1.5));
                      const pct = previewWeightTotal > 0 ? Math.round((weight / previewWeightTotal) * 100) : 0;
                      return (
                        <div key={key} className="flex h-12 items-stretch overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                          <div className="flex w-14 shrink-0 items-center justify-center font-black text-gray-800" style={{ backgroundColor: discipline.cor || buildDistinctPastelColor(index, selectedSubjects.length || 1) }}>
                            {pct}%
                          </div>
                          <div className="flex flex-1 items-center truncate px-3 text-xs font-bold text-gray-700">{discipline.nome}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <WizardFooter onBack={() => setPlanWizardStep(2)} onNext={() => setPlanWizardStep(4)} />
            </div>
          ) : null}

          {planWizardStep === 4 ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 space-y-10">
                <div>
                  <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-600">
                    Quantas horas, em média, pretende estudar <strong className="text-gray-800">por semana</strong>?
                    <HelpCircle size={14} className="text-gray-400" />
                  </label>
                  <input type="number" value={Number(safeWizData.horasSemana || 18)} onChange={(event) => setWizData((prev) => ({ ...prev, horasSemana: Number(event.target.value || 0) }))} className="w-32 border-b-2 border-[#2563EB] pb-1 text-2xl font-black text-gray-800 outline-none" />
                </div>
                <div>
                  <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-600">
                    Qual duração <strong className="text-gray-800">mínima</strong> e <strong className="text-gray-800">máxima</strong> pretende para uma sessão?
                    <HelpCircle size={14} className="text-gray-400" />
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <select value={safeWizData.minSessao || '1h 30m'} onChange={(event) => setWizData((prev) => ({ ...prev, minSessao: event.target.value }))} className="border-b-2 border-[#2563EB] bg-transparent pb-1 text-lg font-bold text-gray-800 outline-none">
                      {['45m', '1h', '1h 30m', '2h'].map((option) => <option key={`min-${option}`} value={option}>{option}</option>)}
                    </select>
                    <span className="font-bold text-gray-400">a</span>
                    <select value={safeWizData.maxSessao || '2h 00m'} onChange={(event) => setWizData((prev) => ({ ...prev, maxSessao: event.target.value }))} className="border-b-2 border-[#2563EB] bg-transparent pb-1 text-lg font-bold text-gray-800 outline-none">
                      {['2h', '2h 30m', '3h', '4h'].map((option) => <option key={`max-${option}`} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 border-t border-gray-100 pt-6">
                <button type="button" onClick={() => setPlanWizardStep(3)} className="rounded-xl border-2 border-gray-200 px-8 py-3.5 font-bold text-gray-500 transition-colors hover:bg-gray-50">Voltar</button>
                <button type="button" onClick={onFinalizeCycle} className="rounded-xl bg-[#2563EB] px-10 py-3.5 font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8]">Concluir</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'flex min-h-0 flex-col gap-3 overflow-hidden lg:h-full' : 'mx-auto flex max-w-[1400px] min-h-0 flex-col gap-3 overflow-hidden lg:h-[calc(100vh-13rem)]'} animate-in fade-in duration-500`}>
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-stretch">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="col-span-1 flex flex-col items-center justify-center rounded-[1.35rem] border border-[#2563EB]/15 bg-white p-3 shadow-sm">
              <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Ciclos completos</span>
              <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-[4px] border-[#2563EB] text-[1.85rem] font-black text-[#2563EB]">{completedCycles}</div>
            </div>
            <div className="col-span-1 rounded-[1.35rem] border border-gray-200 bg-white p-4 shadow-sm md:col-span-3">
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <div>
                  <h3 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso do ciclo atual</h3>
                  <p className="text-sm font-semibold text-gray-500">{formatMinutes(minConcluidosCiclo)} / {formatMinutes(totMinutosCiclo)}</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-[2rem] font-black leading-none text-[#2563EB]">{progressoCiclo}</span>
                  <span className="ml-0.5 text-base font-bold text-[#2563EB]">%</span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div className="h-full rounded-full bg-[#2563EB] transition-all duration-1000 ease-out" style={{ width: `${progressoCiclo}%` }} />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.45rem] border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">Sequência dos Estudos</h3>
              {!isEditingCycle ? (
                <label className="group flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={!showFinishedSessions} onChange={() => setShowFinishedSessions(!showFinishedSessions)} className="h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-colors group-hover:text-gray-600">Ocultar Finalizados</span>
                </label>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ações</span>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5 custom-scrollbar lg:max-h-[calc(100vh-21rem)]">
              {!isEditingCycle
                ? filteredCycle.map((item) => (
                    <CycleRow key={item.id} item={item} onToggle={() => toggleSessionConcluida(item.id)} onStart={openTimerSetup} onRegister={() => setRegistroEstudoModalOpen(true)} timeLabel={formatTimeStr ? formatTimeStr(item.minutos) : formatMinutes(item.minutos)} />
                  ))
                : safeCycle.map((item) => <EditableCycleRow key={item.id} item={item} />)}
            </div>

            {!isEditingCycle ? (
              <div className="flex items-center justify-end border-t border-gray-100 px-3.5 py-2.5">
                <button type="button" onClick={() => setIsEditingCycle(true)} className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]">Editar Ciclo</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4 md:flex-row">
                <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#2563EB] bg-white px-6 py-3 text-sm font-bold text-[#2563EB] transition-colors hover:bg-blue-50 md:w-auto"><Plus size={16} /> Adicionar Disciplina</button>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={onResetCycle} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-red-500">Reiniciar</button>
                  <button type="button" onClick={() => setIsEditingCycle(false)} className="rounded-xl bg-[#2563EB] px-8 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]">Salvar Alterações</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-gray-200 bg-white px-2 py-2.5 shadow-sm">
            <h3 className="mb-1.5 px-1 text-left text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">Ciclo</h3>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="relative aspect-square w-full max-w-[640px]">
                <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible drop-shadow-md">
                  {outerSegments.map((segment, index) => (
                    <path
                      key={`outer-${segment.id || segment.materia || 'segment'}-${index}`}
                      d={segment.path}
                      fill={segment.cor}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={(event) => {
                        event.currentTarget.style.opacity = '0.9';
                        setChartTooltip({ materia: segment.materia, minutos: segment.minutos, cor: segment.cor, x: event.clientX, y: event.clientY });
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.opacity = '1';
                        setChartTooltip(null);
                      }}
                      onMouseMove={(event) => setChartTooltip((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev))}
                    />
                  ))}

                  {innerSegments.map((segment, index) => (
                    <path
                      key={`inner-${segment.materia || 'subject'}-${index}`}
                      d={segment.path}
                      fill={segment.cor}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={(event) => {
                        event.currentTarget.style.opacity = '0.92';
                        setChartTooltip({ materia: segment.materia, minutos: segment.minutos, cor: segment.cor, x: event.clientX, y: event.clientY });
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.opacity = '1';
                        setChartTooltip(null);
                      }}
                      onMouseMove={(event) => setChartTooltip((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev))}
                    />
                  ))}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[2.7rem] font-black leading-none text-[#6E7685]">{formatTimeStr(totMinutosCiclo)}</span>
                </div>
              </div>
            </div>

            {!isEditingCycle ? (
              <div className="mt-2 overflow-hidden rounded-full border border-[#EEF2F7] bg-[#F7F9FC] shadow-inner">
                <div className="flex h-4 w-full overflow-hidden">
                  {groupedSubjects.map((item, index) => (
                    <button
                      key={`${item.key || item.materia || 'legend'}-${index}`}
                      type="button"
                      className="h-full min-w-[20px] transition-transform hover:scale-y-110"
                      style={{
                        flexGrow: Math.max(Number(item.minutos || 0), 1),
                        flexBasis: 0,
                        backgroundColor: item.cor,
                      }}
                      onMouseEnter={(event) =>
                        setChartTooltip({
                          materia: item.materia,
                          minutos: item.minutos,
                          cor: item.cor,
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      onMouseLeave={() => setChartTooltip(null)}
                      onMouseMove={(event) =>
                        setChartTooltip((prev) =>
                          prev
                            ? {
                                ...prev,
                                x: event.clientX,
                                y: event.clientY,
                              }
                            : prev
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

function WizardModeCard({ title, description, icon: Icon, selected, onClick }) {
  return (
    <div onClick={onClick} className={`cursor-pointer rounded-[2rem] border-2 p-8 text-center transition-all ${selected ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-md' : 'border-gray-200 hover:border-[#2563EB]/50'}`}>
      <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${selected ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-[#2563EB]'}`}>
        <Icon size={36} strokeWidth={2.5} />
      </div>
      <h4 className="mb-2 text-xl font-bold text-gray-800">{title}</h4>
      <p className="text-sm font-medium text-gray-500">{description}</p>
    </div>
  );
}

function WizardFooter({ onBack, onNext, nextDisabled = false }) {
  return (
    <div className="flex items-center justify-end gap-4 border-t border-gray-100 pt-6">
      <button type="button" onClick={onBack} className="rounded-xl border-2 border-gray-200 px-8 py-3.5 font-bold text-gray-500 transition-colors hover:bg-gray-50">Voltar</button>
      <button type="button" onClick={onNext} disabled={nextDisabled} className="rounded-xl bg-[#2563EB] px-10 py-3.5 font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8] disabled:opacity-50">Próximo</button>
    </div>
  );
}

function SliderRow({ label, value, max, step, onChange }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <span>{label}</span>
        <span className="text-[#2563EB]">{value}</span>
      </div>
      <input type="range" min="1" max={String(max)} step={String(step)} value={value} onChange={(event) => onChange(event.target.value)} className="w-full cursor-pointer accent-[#2563EB]" />
    </div>
  );
}

function CycleRow({ item, onStart, onRegister, onHistory = () => {}, timeLabel }) {
  const rawProgress = Math.round(Number(item.progresso || 0));
  const progressWidth = Math.max(0, Math.min(rawProgress, 100));

  return (
    <div className={`group relative rounded-[1.3rem] border border-[#EEF2F7] bg-[#FAFBFD] px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${item.concluido ? 'opacity-60' : 'hover:border-[#DCE6F4] hover:shadow-sm'}`}>
      <div
        className={`absolute left-4 top-3 w-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${item.concluido ? 'h-[2.9rem]' : 'h-[2.9rem] group-hover:h-[calc(100%-0.9rem)]'}`}
        style={{ backgroundColor: item.cor }}
      />
      <div className="pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h4 className={`truncate text-[0.94rem] font-bold ${item.concluido ? 'text-gray-500 line-through' : 'text-[#243A5A]'}`}>{item.materia}</h4>
              <span className="flex shrink-0 items-center gap-1 text-[0.8rem] font-medium text-[#50607A]"><Clock size={13} /> {item.concluido ? 'Finalizado' : timeLabel}</span>
            </div>
            <div className="mt-2 h-[0.34rem] w-full overflow-hidden rounded-full bg-[#E9EEF5]">
              <div className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${progressWidth}%`, backgroundColor: item.cor }} />
            </div>
          </div>
        </div>

        {!item.concluido ? (
          <div className="max-h-0 translate-y-1 overflow-hidden opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-h-24 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEF2F7] pt-3 text-[0.82rem] font-medium text-[#304A70]">
              <button type="button" onClick={onStart} className="flex items-center gap-1.5 transition-colors hover:text-[#2563EB]"><Play size={15} fill="currentColor" className="text-[#2563EB]" /> Iniciar estudo</button>
              <button type="button" onClick={onRegister} className="flex items-center gap-1.5 transition-colors hover:text-[#2563EB]"><PlusCircle size={15} className="text-[#304A70]" /> Adicionar estudo manualmente</button>
              <button type="button" onClick={onHistory} className="flex items-center gap-1.5 transition-colors hover:text-[#2563EB]"><RotateCcw size={15} /> Ver últimos estudos</button>
              <span className="text-[0.76rem] font-semibold text-[#7B879C]">{rawProgress}%</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EditableCycleRow({ item }) {
  return (
    <div className="flex flex-col justify-between gap-6 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-sm md:flex-row md:items-center">
      <div className="flex w-full flex-1 items-center gap-4">
        <div className="h-16 w-1.5 rounded-full" style={{ backgroundColor: item.cor }} />
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Disciplina</label>
          <div className="border-b-2 border-gray-300 pb-1.5 text-sm font-bold text-gray-800">{item.materia}</div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-6 md:w-auto md:border-l md:border-gray-200 md:pl-6">
        <div className="w-24">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Minutos</label>
          <div className="border-b-2 border-gray-300 pb-1.5 text-center text-sm font-bold text-gray-800">{item.minutos}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500 shadow-sm transition-colors hover:text-gray-800">Duplicar</button>
          <button type="button" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500 shadow-sm transition-colors hover:text-red-500">Remover</button>
        </div>
      </div>
    </div>
  );
}

function formatMinutes(minutes = 0) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins}min`;
  return `${hours}h${mins > 0 ? `${mins}min` : '00min'}`;
}

function buildDistinctPastelColor(index) {
  const safeIndex = Math.max(0, Number(index || 0));
  if (safeIndex < CYCLE_PASTEL_COLORS.length) {
    return CYCLE_PASTEL_COLORS[safeIndex];
  }

  const hue = Math.round(((safeIndex - CYCLE_PASTEL_COLORS.length) * 137.508 + 12) % 360);
  const saturation = 54 - (safeIndex % 3) * 3;
  const lightness = 86 - (safeIndex % 2) * 2;
  return `hsl(${hue} ${Math.max(42, saturation)}% ${Math.max(78, lightness)}%)`;
}

function buildInnerCycleSegments(subjects) {
  const safeSubjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
  const totalMinutes = safeSubjects.reduce((acc, item) => acc + Number(item?.minutos || 0), 0) || 1;
  let currentAngle = 0;

  return safeSubjects.map((subject) => {
    const span = (Number(subject?.minutos || 0) / totalMinutes) * 360;
    const gap = Math.min(1.4, span * 0.24);
    const startAngle = currentAngle + gap / 2;
    const endAngle = currentAngle + span - gap / 2;
    currentAngle += span;

    return {
      ...subject,
      startAngle,
      endAngle,
      path: createDonutArcPath(startAngle, endAngle, INNER_RING_INNER_RADIUS, INNER_RING_OUTER_RADIUS),
      percentFormat: Math.max(1, Math.round((Number(subject?.minutos || 0) / totalMinutes) * 100)),
    };
  });
}

function buildOuterCycleSegments(subjects) {
  const safeSubjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
  const totalMinutes = safeSubjects.reduce((acc, item) => acc + Number(item?.minutos || 0), 0) || 1;
  const segments = [];
  let currentAngle = 0;

  safeSubjects.forEach((subject) => {
    const subjectMinutes = Number(subject?.minutos || 0);
    const subjectSpan = (subjectMinutes / totalMinutes) * 360;
    const subjectGap = Math.min(1.4, subjectSpan * 0.24);
    const usableStart = currentAngle + subjectGap / 2;
    const usableEnd = currentAngle + subjectSpan - subjectGap / 2;
    const usableSpan = Math.max(usableEnd - usableStart, 0);
    let blockCursor = usableStart;

    (Array.isArray(subject?.blocos) ? subject.blocos : []).forEach((block, index, list) => {
      const blockSpan = usableSpan * (Number(block?.minutos || 0) / Math.max(subjectMinutes, 1));
      const blockGap = list.length > 1 ? Math.min(0.9, blockSpan * 0.22) : 0;
      const startAngle = blockCursor + blockGap / 2;
      const endAngle = blockCursor + blockSpan - blockGap / 2;

      segments.push({
        ...block,
        materia: subject.materia,
        cor: subject.cor,
        startAngle,
        endAngle,
        path: createDonutArcPath(startAngle, endAngle, OUTER_RING_INNER_RADIUS, OUTER_RING_OUTER_RADIUS),
        percentFormat: Math.max(1, Math.round((Number(block?.minutos || 0) / totalMinutes) * 100)),
      });

      blockCursor += blockSpan;
    });

    currentAngle += subjectSpan;
  });

  return segments;
}

function createDonutArcPath(startAngle, endAngle, innerRadius, outerRadius) {
  const safeStart = Number.isFinite(startAngle) ? startAngle : 0;
  const safeEnd = Number.isFinite(endAngle) ? endAngle : safeStart;

  if (safeEnd <= safeStart) {
    return '';
  }

  const startOuter = polarToCartesian(CHART_CENTER, CHART_CENTER, outerRadius, safeStart);
  const endOuter = polarToCartesian(CHART_CENTER, CHART_CENTER, outerRadius, safeEnd);
  const startInner = polarToCartesian(CHART_CENTER, CHART_CENTER, innerRadius, safeEnd);
  const endInner = polarToCartesian(CHART_CENTER, CHART_CENTER, innerRadius, safeStart);
  const largeArcFlag = safeEnd - safeStart > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

