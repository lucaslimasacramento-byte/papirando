import React from 'react';
import { Pause, Play, X } from 'lucide-react';
import RegistroSimuladoModal from './RegistroSimuladoModal';
import RegistroEstudoModal from './RegistroEstudoModal';
import EditarDisciplinaModal from './EditarDisciplinaModal';
import LinkModal from './LinkModal';
import CadernoModal from './CadernoModal';
import TimerOverlay from './TimerOverlay';
import FiltrosAvancados from './FiltrosAvancados';

function WellnessMiniPlayer({ track, isPlaying, onTogglePlay, onClose }) {
  if (!track) return null;

  return (
    <div style={{ pointerEvents: 'auto', position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 180, width: 'min(560px, calc(100vw - 2rem))', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 22, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '10px 14px', boxShadow: 'var(--pl-sh-high)', backdropFilter: 'blur(12px)' }}>
      <button
        type="button"
        onClick={onTogglePlay}
        style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: 'var(--pl-accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-bg)' }}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 800, color: 'var(--pl-ink)' }}>{track.title}</p>
        <p style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--pl-ink-3)' }}>
          {track.category || 'Faixa'} · {track.durationLabel || 'Duracao livre'}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function AppOverlays(props) {
  const {
    activeWellnessTrack,
    wellnessAudioRef,
    isWellnessPlaying,
    handleToggleWellnessPlayback,
    handleCloseWellnessPlayer,
    registroSimuladoModalOpen,
    setRegistroSimuladoModalOpen,
    saveSimuladoNoApp,
    simuladoDraft,
    registroEstudoModalOpen,
    setRegistroEstudoModalOpen,
    bancoDisciplinas,
    cursos,
    timerValue,
    formatTimeStr,
    registrarEstudoNoApp,
    studySessionDraft,
    setStudySessionDraft,
    editingDiscipline,
    setEditingDiscipline,
    setBancoDisciplinas,
    subjectCatalog,
    linkModalOpen,
    setLinkModalOpen,
    isCadernoModalOpen,
    setIsCadernoModalOpen,
    isTimerModalOpen,
    setIsTimerModalOpen,
    showTimerSetup,
    timerMode,
    setTimerMode,
    timerMax,
    setTimerMax,
    formatHHMMSS,
    isTimerRunning,
    setIsTimerRunning,
    saveAsFavorite,
    setSaveAsFavorite,
    startActualTimer,
    handleStopTimer,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
  } = props;

  return (
    <>
      {activeWellnessTrack ? (
        <>
          <audio ref={wellnessAudioRef} className="hidden" />
          <WellnessMiniPlayer
            track={activeWellnessTrack}
            isPlaying={isWellnessPlaying}
            onTogglePlay={handleToggleWellnessPlayback}
            onClose={handleCloseWellnessPlayer}
          />
        </>
      ) : null}

      <RegistroSimuladoModal
        registroSimuladoModalOpen={registroSimuladoModalOpen}
        setRegistroSimuladoModalOpen={setRegistroSimuladoModalOpen}
        onSaveSimulado={saveSimuladoNoApp}
        initialDraft={simuladoDraft}
        bancoDisciplinas={bancoDisciplinas}
      />

      <RegistroEstudoModal
        registroEstudoModalOpen={registroEstudoModalOpen}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        bancoDisciplinas={bancoDisciplinas}
        cursos={cursos}
        timerValue={timerValue}
        formatTimeStr={formatTimeStr}
        adicionarNovoEstudo={registrarEstudoNoApp}
        draftRegistroEstudo={studySessionDraft}
        onResetDraft={() => setStudySessionDraft(null)}
      />

      <EditarDisciplinaModal
        editingDiscipline={editingDiscipline}
        setEditingDiscipline={setEditingDiscipline}
        setBancoDisciplinas={setBancoDisciplinas}
        cursos={cursos}
        subjectCatalog={subjectCatalog}
      />

      <LinkModal linkModalOpen={linkModalOpen} setLinkModalOpen={setLinkModalOpen} />

      <CadernoModal
        isCadernoModalOpen={isCadernoModalOpen}
        setIsCadernoModalOpen={setIsCadernoModalOpen}
      />

      <TimerOverlay
        isTimerModalOpen={isTimerModalOpen}
        setIsTimerModalOpen={setIsTimerModalOpen}
        showTimerSetup={showTimerSetup}
        timerMode={timerMode}
        setTimerMode={setTimerMode}
        timerMax={timerMax}
        setTimerMax={setTimerMax}
        timerValue={timerValue}
        formatHHMMSS={formatHHMMSS}
        isTimerRunning={isTimerRunning}
        setIsTimerRunning={setIsTimerRunning}
        saveAsFavorite={saveAsFavorite}
        setSaveAsFavorite={setSaveAsFavorite}
        startActualTimer={startActualTimer}
        handleStopTimer={handleStopTimer}
      />

      <FiltrosAvancados
        isFilterPanelOpen={isFilterPanelOpen}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
        bancoDisciplinas={bancoDisciplinas}
      />
    </>
  );
}
