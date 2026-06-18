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
          materia: item?.materia || item?.nome || `Materia ${index + 1}`,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
        <div className="pl-card" style={{ padding: 'clamp(16px, 3vw, 32px) clamp(14px, 4vw, 40px)' }}>
          {/* Step indicator */}
          <div style={{ position: 'relative', display: 'flex', maxWidth: 560, margin: '0 auto 48px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', zIndex: 0, height: 4, transform: 'translateY(-50%)', borderRadius: 999, background: 'var(--pl-bg-soft)' }} />
            <div style={{ position: 'absolute', left: 0, top: '50%', zIndex: 0, height: 4, transform: 'translateY(-50%)', borderRadius: 999, background: 'var(--pl-accent)', transition: 'width 0.5s', width: `${((planWizardStep - 1) / 3) * 100}%` }} />
            {[1, 2, 3, 4].map((step) => (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '4px solid var(--pl-surface)', fontSize: 13, fontWeight: 900, transition: 'background 0.2s', background: planWizardStep >= step ? 'var(--pl-accent)' : 'var(--pl-bg-soft)', color: planWizardStep >= step ? '#fff' : 'var(--pl-ink-3)' }}>
                  {String(step).padStart(2, '0')}
                </div>
                <span style={{ marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: planWizardStep >= step ? 'var(--pl-accent)' : 'var(--pl-ink-3)' }}>
                  {step === 1 ? 'Organização' : step === 2 ? 'Disciplinas' : step === 3 ? 'Relevância' : 'Horários'}
                </span>
              </div>
            ))}
          </div>

          {planWizardStep === 1 ? (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Para iniciar o seu planejamento, escolha a melhor forma de visualização para você:</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <WizardModeCard title="Ciclo de Estudos" description="Estude as disciplinas em uma ordem rotativa, sem depender de dias fixos. Ideal para quem precisa de flexibilidade na rotina." icon={RefreshCw} selected={safeWizData.tipo === 'ciclo'} onClick={() => { setWizData((prev) => ({ ...prev, tipo: 'ciclo' })); setPlanWizardStep(2); }} />
                <WizardModeCard title="Planejamento Semanal" description="Define quais materias estudar em cada dia da semana. Otimo para quem prefere uma rotina fixa e estruturada." icon={CalendarDays} selected={safeWizData.tipo === 'semanal'} onClick={() => { setWizData((prev) => ({ ...prev, tipo: 'semanal' })); setPlanWizardStep(2); }} />
              </div>
            </div>
          ) : null}

          {planWizardStep === 2 ? (
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Selecione quais das <strong style={{ color: 'var(--pl-ink)' }}>suas disciplinas</strong> deseja colocar no seu <strong style={{ color: 'var(--pl-ink)' }}>planejamento</strong>.</p>
              </div>
              <div style={{ marginBottom: 40, borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '24px 28px' }}>
                <div style={{ display: 'grid', maxHeight: 320, gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16, overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
                  {safeDisciplines.map((discipline) => (
                    <button key={getWeightKey(discipline)} type="button" onClick={() => toggleWizMateria(discipline)} style={{ overflow: 'hidden', borderRadius: 10, border: isSelected(discipline) ? '2px solid var(--pl-accent)' : '2px solid var(--pl-rule-2)', padding: '14px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, background: isSelected(discipline) ? 'var(--pl-accent-soft)' : 'var(--pl-surface)', color: isSelected(discipline) ? 'var(--pl-accent)' : 'var(--pl-ink-2)', cursor: 'pointer', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {discipline.nome}
                    </button>
                  ))}
                </div>
              </div>
              <WizardFooter onBack={() => setPlanWizardStep(1)} onNext={() => setPlanWizardStep(3)} nextDisabled={selectedSubjects.length === 0} />
            </div>
          ) : null}

          {planWizardStep === 3 ? (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Para cada disciplina, selecione a <strong style={{ color: 'var(--pl-ink)' }}>importancia</strong> e o seu <strong style={{ color: 'var(--pl-ink)' }}>grau de conhecimento</strong>.</p>
              </div>
              <div style={{ marginBottom: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
                <div style={{ display: 'grid', maxHeight: 450, flex: 1, gridTemplateColumns: '1fr 1fr', gap: 24, overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
                  {selectedSubjects.map((discipline) => {
                    const key = getWeightKey(discipline);
                    const currentPeso = safeWizData.pesos?.[key] || { imp: 5, con: 1.5 };
                    return (
                      <div key={key} className="pl-card" style={{ padding: 24 }}>
                        <h4 style={{ margin: '0 0 24px', textAlign: 'center', fontWeight: 700, color: 'var(--pl-ink)' }}>{discipline.nome}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                          <SliderRow label="Importancia" value={Number(currentPeso.imp || 5)} max={5} step={1} onChange={(value) => handlePesoChange(discipline, 'imp', value)} />
                          <SliderRow label="Conhecimento" value={Number(currentPeso.con || 1.5)} max={5} step={0.5} onChange={(value) => handlePesoChange(discipline, 'con', value)} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ minWidth: 0, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 24 }}>
                  <h4 className="pl-eyebrow" style={{ margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid var(--pl-rule-2)' }}>Pré-visualização do ciclo</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar">
                    {selectedSubjects.map((discipline, index) => {
                      const key = getWeightKey(discipline);
                      const currentPeso = safeWizData.pesos?.[key] || { imp: 5, con: 1.5 };
                      const weight = Number(currentPeso.imp || 5) * (6 - Number(currentPeso.con || 1.5));
                      const pct = previewWeightTotal > 0 ? Math.round((weight / previewWeightTotal) * 100) : 0;
                      return (
                        <div key={key} style={{ display: 'flex', height: 48, alignItems: 'stretch', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--pl-rule)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
                          <div style={{ display: 'flex', width: 56, flexShrink: 0, alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1e293b', fontSize: 12, backgroundColor: discipline.cor || buildDistinctPastelColor(index, selectedSubjects.length || 1) }}>
                            {pct}%
                          </div>
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{discipline.nome}</div>
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
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 40 }}>
                <div>
                  <label style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                    Quantas horas, em media, pretende estudar <strong style={{ color: 'var(--pl-ink)' }}>por semana</strong>?
                    <HelpCircle size={14} style={{ color: 'var(--pl-ink-3)' }} />
                  </label>
                  <input type="number" value={Number(safeWizData.horasSemana || 18)} onChange={(event) => setWizData((prev) => ({ ...prev, horasSemana: Number(event.target.value || 0) }))} style={{ width: 128, paddingBottom: 4, fontSize: 24, fontWeight: 900, color: 'var(--pl-ink)', background: 'transparent', outline: 'none', border: 'none', borderBottom: '2px solid var(--pl-accent)' }} />
                </div>
                <div>
                  <label style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                    Qual duracao <strong style={{ color: 'var(--pl-ink)' }}>minima</strong> e <strong style={{ color: 'var(--pl-ink)' }}>maxima</strong> pretende para uma sessao?
                    <HelpCircle size={14} style={{ color: 'var(--pl-ink-3)' }} />
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                    <select value={safeWizData.minSessao || '1h 30m'} onChange={(event) => setWizData((prev) => ({ ...prev, minSessao: event.target.value }))} style={{ background: 'transparent', paddingBottom: 4, fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)', outline: 'none', border: 'none', borderBottom: '2px solid var(--pl-accent)', cursor: 'pointer' }}>
                      {['45m', '1h', '1h 30m', '2h'].map((option) => <option key={`min-${option}`} value={option}>{option}</option>)}
                    </select>
                    <span style={{ fontWeight: 700, color: 'var(--pl-ink-3)' }}>a</span>
                    <select value={safeWizData.maxSessao || '2h 00m'} onChange={(event) => setWizData((prev) => ({ ...prev, maxSessao: event.target.value }))} style={{ background: 'transparent', paddingBottom: 4, fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)', outline: 'none', border: 'none', borderBottom: '2px solid var(--pl-accent)', cursor: 'pointer' }}>
                      {['2h', '2h 30m', '3h', '4h'].map((option) => <option key={`max-${option}`} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, borderTop: '1px solid var(--pl-rule)', paddingTop: 24 }}>
                <button type="button" onClick={() => setPlanWizardStep(3)} className="pl-btn pl-btn-ghost" style={{ padding: '10px 24px' }}>Voltar</button>
                <button type="button" onClick={onFinalizeCycle} className="pl-btn pl-btn-primary" style={{ padding: '10px 32px' }}>Concluir</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
      <header style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <span className="pl-tag pl-tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ListOrdered size={13} />
            Estudo ciclico
          </span>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 44, color: 'var(--pl-ink)' }}>
            Ciclos de estudo<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '10px 0 0', maxWidth: 680, color: 'var(--pl-ink-2)', fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>
            Sequencie blocos, acompanhe o progresso e ajuste o edital com ritmo claro.
          </p>
        </div>
      </header>
      <div style={{ display: 'grid', minHeight: 0, gap: 12, gridTemplateColumns: '1fr', alignItems: 'stretch' }} className="ciclos-layout-grid">
        <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
            <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <span className="pl-eyebrow" style={{ marginBottom: 8 }}>Ciclos completos</span>
              <div style={{ display: 'flex', height: 66, width: 66, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '4px solid var(--pl-accent)', fontSize: '1.85rem', fontWeight: 900, color: 'var(--pl-accent)' }}>{completedCycles}</div>
            </div>
            <div className="pl-card" style={{ gridColumn: 'span 3', padding: 16 }}>
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 className="pl-eyebrow" style={{ marginBottom: 4 }}>Progresso do ciclo atual</h3>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{formatMinutes(minConcluidosCiclo)} / {formatMinutes(totMinutosCiclo)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span className="pl-num" style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--pl-accent)' }}>{progressoCiclo}</span>
                  <span style={{ marginLeft: 2, fontSize: 16, fontWeight: 700, color: 'var(--pl-accent)' }}>%</span>
                </div>
              </div>
              <div className="pl-progress" style={{ height: 10 }}>
                <div className="pl-progress-bar" style={{ width: `${progressoCiclo}%`, background: 'var(--pl-accent)' }} />
              </div>
            </div>
          </div>

          <div className="pl-card" style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '12px 14px' }}>
              <h3 className="pl-eyebrow">Sequencia dos Estudos</h3>
              {!isEditingCycle ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!showFinishedSessions} onChange={() => setShowFinishedSessions(!showFinishedSessions)} style={{ height: 16, width: 16, borderRadius: 4, borderColor: 'var(--pl-rule-2)', accentColor: 'var(--pl-accent)' }} />
                  <span className="pl-eyebrow" style={{ fontSize: 10 }}>Ocultar Finalizados</span>
                </label>
              ) : (
                <span className="pl-eyebrow" style={{ fontSize: 10 }}>Acoes</span>
              )}
            </div>

            <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 21rem)' }} className="custom-scrollbar">
              {!isEditingCycle
                ? filteredCycle.map((item) => (
                    <CycleRow key={item.id} item={item} onToggle={() => toggleSessionConcluida(item.id)} onStart={openTimerSetup} onRegister={() => setRegistroEstudoModalOpen(true)} timeLabel={formatTimeStr ? formatTimeStr(item.minutos) : formatMinutes(item.minutos)} />
                  ))
                : safeCycle.map((item) => <EditableCycleRow key={item.id} item={item} />)}
            </div>

            {!isEditingCycle ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--pl-rule)', padding: '10px 14px' }}>
                <button type="button" onClick={() => setIsEditingCycle(true)} className="pl-btn pl-btn-primary pl-btn-sm">Editar Ciclo</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '16px 24px' }}>
                <button type="button" className="pl-btn pl-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', borderColor: 'var(--pl-accent)', color: 'var(--pl-accent)' }}><Plus size={16} /> Adicionar Disciplina</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="button" onClick={onResetCycle} className="pl-btn pl-btn-ghost" style={{ color: 'var(--pl-danger)' }}>Reiniciar</button>
                  <button type="button" onClick={() => setIsEditingCycle(false)} className="pl-btn pl-btn-primary">Salvar Alteracoes</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ minHeight: 0 }}>
          <div className="pl-card" style={{ position: 'relative', display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column', overflow: 'hidden', padding: '10px 8px' }}>
            <h3 className="pl-eyebrow" style={{ marginBottom: 6, paddingLeft: 4, textAlign: 'left' }}>Ciclo</h3>
            <div style={{ display: 'flex', minHeight: 0, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', maxWidth: 640 }}>
                <svg viewBox="0 0 120 120" style={{ height: '100%', width: '100%', overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.07))' }}>
                  {outerSegments.map((segment, index) => (
                    <path
                      key={`outer-${segment.id || segment.materia || 'segment'}-${index}`}
                      d={segment.path}
                      fill={segment.cor}
                      style={{ cursor: 'pointer', transition: 'all 0.3s' }}
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
                      style={{ cursor: 'pointer', transition: 'all 0.3s' }}
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
                <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="pl-num" style={{ fontSize: '2.7rem', lineHeight: 1, color: 'var(--pl-ink-3)' }}>{formatTimeStr(totMinutosCiclo)}</span>
                </div>
              </div>
            </div>

            {!isEditingCycle ? (
              <div style={{ marginTop: 8, overflow: 'hidden', borderRadius: 999, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)' }}>
                <div style={{ display: 'flex', height: 16, width: '100%', overflow: 'hidden' }}>
                  {groupedSubjects.map((item, index) => (
                    <button
                      key={`${item.key || item.materia || 'legend'}-${index}`}
                      type="button"
                      style={{
                        height: '100%',
                        minWidth: 20,
                        flexGrow: Math.max(Number(item.minutos || 0), 1),
                        flexBasis: 0,
                        backgroundColor: item.cor,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.transform = 'scaleY(1.1)';
                        setChartTooltip({
                          materia: item.materia,
                          minutos: item.minutos,
                          cor: item.cor,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.transform = 'scaleY(1)';
                        setChartTooltip(null);
                      }}
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
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 32,
        border: selected ? '2px solid var(--pl-accent)' : '2px solid var(--pl-rule-2)',
        padding: 32,
        textAlign: 'center',
        transition: 'all 0.2s',
        background: selected ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
        boxShadow: selected ? 'var(--pl-sh-low)' : 'none',
      }}
    >
      <div style={{ margin: '0 auto 24px', display: 'flex', height: 80, width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: selected ? 'var(--pl-accent)' : 'var(--pl-bg-soft)', color: selected ? '#fff' : 'var(--pl-accent)' }}>
        <Icon size={36} strokeWidth={2.5} />
      </div>
      <h4 style={{ marginBottom: 8, fontSize: 20, fontWeight: 700, color: 'var(--pl-ink)' }}>{title}</h4>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{description}</p>
    </div>
  );
}

function WizardFooter({ onBack, onNext, nextDisabled = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, borderTop: '1px solid var(--pl-rule)', paddingTop: 24 }}>
      <button type="button" onClick={onBack} className="pl-btn pl-btn-ghost" style={{ padding: '10px 32px', fontWeight: 700 }}>Voltar</button>
      <button type="button" onClick={onNext} disabled={nextDisabled} className="pl-btn pl-btn-primary" style={{ padding: '10px 40px', fontWeight: 700, boxShadow: '0 4px 14px rgba(37,99,235,0.3)', opacity: nextDisabled ? 0.5 : 1 }}>Proximo</button>
    </div>
  );
}

function SliderRow({ label, value, max, step, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--pl-ink-3)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--pl-accent)' }}>{value}</span>
      </div>
      <input type="range" min="1" max={String(max)} step={String(step)} value={value} onChange={(event) => onChange(event.target.value)} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--pl-accent)' }} />
    </div>
  );
}

function CycleRow({ item, onStart, onRegister, timeLabel }) {
  const rawProgress = Math.round(Number(item.progresso || 0));
  const progressWidth = Math.max(0, Math.min(rawProgress, 100));

  return (
    <div
      className="group"
      style={{
        position: 'relative',
        borderRadius: 20,
        border: '1px solid var(--pl-rule)',
        background: 'var(--pl-bg-soft)',
        padding: '12px 16px',
        transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
        opacity: item.concluido ? 0.6 : 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 12,
          width: 6,
          height: '2.9rem',
          borderRadius: 999,
          backgroundColor: item.cor,
          transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      <div style={{ paddingLeft: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.94rem', fontWeight: 700, color: item.concluido ? 'var(--pl-ink-3)' : 'var(--pl-ink)', textDecoration: item.concluido ? 'line-through' : 'none' }}>{item.materia}</h4>
              <span style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--pl-ink-2)' }}><Clock size={13} /> {item.concluido ? 'Finalizado' : timeLabel}</span>
            </div>
            <div style={{ marginTop: 8, height: '0.34rem', width: '100%', overflow: 'hidden', borderRadius: 999, background: 'var(--pl-rule-2)' }}>
              <div style={{ height: '100%', borderRadius: 999, transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)', width: `${progressWidth}%`, backgroundColor: item.cor }} />
            </div>
          </div>
        </div>

        {!item.concluido ? (
          <div style={{ maxHeight: 0, overflow: 'hidden', opacity: 0, transform: 'translateY(4px)', transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)' }} className="cycle-row-actions">
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px', borderTop: '1px solid var(--pl-rule)', paddingTop: 12, fontSize: '0.82rem', fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              <button type="button" onClick={onStart} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', transition: 'color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pl-accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--pl-ink-2)'; }}><Play size={15} fill="currentColor" style={{ color: 'var(--pl-accent)' }} /> Iniciar estudo</button>
              <button type="button" onClick={onRegister} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', transition: 'color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pl-accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--pl-ink-2)'; }}><PlusCircle size={15} style={{ color: 'var(--pl-ink-2)' }} /> Adicionar estudo manualmente</button>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--pl-ink-3)' }}>{rawProgress}%</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EditableCycleRow({ item }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24, borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20, boxShadow: 'var(--pl-sh-low)' }}>
      <div style={{ display: 'flex', width: '100%', flex: 1, alignItems: 'center', gap: 16 }}>
        <div style={{ height: 64, width: 6, borderRadius: 999, backgroundColor: item.cor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Disciplina</label>
          <div style={{ borderBottom: '2px solid var(--pl-rule-2)', paddingBottom: 6, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.materia}</div>
        </div>
      </div>
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ width: 96 }}>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Minutos</label>
          <div style={{ borderBottom: '2px solid var(--pl-rule-2)', paddingBottom: 6, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.minutos}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" style={{ width: '100%' }}>Duplicar</button>
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" style={{ width: '100%', color: 'var(--pl-danger)' }}>Remover</button>
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
