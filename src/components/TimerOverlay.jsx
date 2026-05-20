import React from 'react';
import { Timer, Clock, Play, CheckCircle2, Pause, Square } from 'lucide-react';

export default function TimerOverlay({
  isTimerModalOpen,
  setIsTimerModalOpen,
  showTimerSetup,
  timerMode,
  setTimerMode,
  timerMax,
  setTimerMax,
  timerValue,
  formatHHMMSS,
  isTimerRunning,
  setIsTimerRunning,
  saveAsFavorite,
  setSaveAsFavorite,
  startActualTimer,
  handleStopTimer
}) {
  if (!isTimerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col overflow-y-auto bg-[#14110d] animate-in fade-in duration-300">
       <div className="sticky top-0 z-10 flex justify-end bg-gradient-to-b from-[#14110d] to-transparent px-4 py-4 sm:px-6">
         <button onClick={() => setIsTimerModalOpen(false)} className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white">Fechar</button>
       </div>
       <div className="relative flex min-h-[calc(100dvh-68px)] flex-1 flex-col items-center justify-center px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
         {showTimerSetup ? (
           <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 sm:p-7 md:p-8">
             <div className="mb-6 text-center">
               <div className="w-16 h-16 bg-[#1d4ed8] rounded-2xl flex items-center justify-center mx-auto mb-4 text-white"><Timer size={32}/></div>
               <h2 className="text-2xl font-black text-white mb-2">Configurar Sessão</h2>
               <p className="text-blue-200 text-sm font-medium">Escolha o seu método de estudo e foque no objetivo.</p>
             </div>
             <div className="mb-6 space-y-3">
               <button onClick={() => {setTimerMode('pomodoro'); setTimerMax(25*60);}} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${timerMode === 'pomodoro' && timerMax === 25*60 ? 'border-[#1d4ed8] bg-[#1d4ed8]/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                 <div className="flex items-center gap-3"><Clock size={20}/><span className="font-bold">Pomodoro (25 min)</span></div>
                 {timerMode === 'pomodoro' && timerMax === 25*60 && <CheckCircle2 size={20} className="text-[#1d4ed8]"/>}
               </button>
               <button onClick={() => {setTimerMode('pomodoro'); setTimerMax(50*60);}} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${timerMode === 'pomodoro' && timerMax === 50*60 ? 'border-[#1d4ed8] bg-[#1d4ed8]/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                 <div className="flex items-center gap-3"><Clock size={20}/><span className="font-bold">Sessão Longa (50 min)</span></div>
                 {timerMode === 'pomodoro' && timerMax === 50*60 && <CheckCircle2 size={20} className="text-[#1d4ed8]"/>}
               </button>
               <button onClick={() => {setTimerMode('cronometro'); setTimerMax(0);}} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${timerMode === 'cronometro' ? 'border-[#1d4ed8] bg-[#1d4ed8]/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                 <div className="flex items-center gap-3"><Play size={20}/><span className="font-bold">Livre (Cronómetro)</span></div>
                 {timerMode === 'cronometro' && <CheckCircle2 size={20} className="text-[#1d4ed8]"/>}
               </button>
             </div>
             <div className="mb-6 flex items-center gap-3 px-2">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={saveAsFavorite} onChange={() => setSaveAsFavorite(!saveAsFavorite)} className="w-4 h-4 rounded text-[#1d4ed8] focus:ring-[#1d4ed8] border-gray-400 cursor-pointer" />
                  <span className="text-sm font-medium text-gray-300">Salvar como meu método padrão</span>
               </label>
             </div>
             <button onClick={startActualTimer} className="w-full bg-[#1d4ed8] text-white py-4 rounded-xl font-bold text-lg shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2">
               <Play fill="currentColor" size={20}/> Começar a Estudar
             </button>
           </div>
         ) : (
           <div className="flex flex-col items-center animate-in fade-in duration-300">
             <div className="text-[14px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               Sessão em andamento: {timerMode === 'pomodoro' ? 'Pomodoro' : 'Modo Livre'}
             </div>
             <div className="text-[7rem] sm:text-[10rem] md:text-[12rem] font-bold text-white leading-none font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(37,99,235,0.2)]">
               {formatHHMMSS(timerValue)}
             </div>
             <div className="mt-16 flex items-center gap-6 relative">
               <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-20 h-20 bg-white hover:bg-gray-200 text-[#14110d] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform hover:scale-105">
                 {isTimerRunning ? <Pause size={36} fill="currentColor"/> : <Play size={36} fill="currentColor" className="ml-2"/>}
               </button>
               <button onClick={handleStopTimer} className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-transform hover:scale-105">
                 <Square size={28} fill="currentColor"/>
               </button>
             </div>
           </div>
         )}
       </div>
    </div>
  );
}