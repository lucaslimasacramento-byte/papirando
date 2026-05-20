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
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[180] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-[1.4rem] border border-gray-200 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-md">
      <button
        type="button"
        onClick={onTogglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#1e40af]">{track.title}</p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
          {track.category || 'Faixa'} · {track.durationLabel || 'Duracao livre'}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500"
      >
        <X size={16} />
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
