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

  const modeActive = {
    background: 'rgba(30,58,95,0.25)',
    border: '2px solid rgba(147,180,255,0.5)',
    color: '#fff',
  };
  const modeIdle = {
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(255,255,255,0.10)',
    color: 'rgba(200,210,230,0.85)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#0F172A' }}>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', background: 'linear-gradient(to bottom, #0F172A, transparent)', padding: '16px 24px' }}>
        <button
          onClick={() => setIsTimerModalOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: 'rgba(200,210,230,0.85)', cursor: 'pointer' }}
        >
          Fechar
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 16px 32px' }}>
        {showTimerSetup ? (
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 28, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(16px)', padding: '28px 28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: '#1e3a5f', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' }}>
                <Timer size={28} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Configurar Sessão</h2>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(147,180,255,0.85)' }}>
                Escolha o seu método de estudo e foque no objetivo.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => { setTimerMode('pomodoro'); setTimerMax(25 * 60); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s', ...(timerMode === 'pomodoro' && timerMax === 25 * 60 ? modeActive : modeIdle) }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={18} />
                  <span style={{ fontWeight: 700 }}>Pomodoro (25 min)</span>
                </div>
                {timerMode === 'pomodoro' && timerMax === 25 * 60 && <CheckCircle2 size={18} style={{ color: 'rgba(147,180,255,0.9)' }} />}
              </button>

              <button
                onClick={() => { setTimerMode('pomodoro'); setTimerMax(50 * 60); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s', ...(timerMode === 'pomodoro' && timerMax === 50 * 60 ? modeActive : modeIdle) }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={18} />
                  <span style={{ fontWeight: 700 }}>Sessão Longa (50 min)</span>
                </div>
                {timerMode === 'pomodoro' && timerMax === 50 * 60 && <CheckCircle2 size={18} style={{ color: 'rgba(147,180,255,0.9)' }} />}
              </button>

              <button
                onClick={() => { setTimerMode('cronometro'); setTimerMax(0); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s', ...(timerMode === 'cronometro' ? modeActive : modeIdle) }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Play size={18} />
                  <span style={{ fontWeight: 700 }}>Livre (Cronómetro)</span>
                </div>
                {timerMode === 'cronometro' && <CheckCircle2 size={18} style={{ color: 'rgba(147,180,255,0.9)' }} />}
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveAsFavorite}
                onChange={() => setSaveAsFavorite(!saveAsFavorite)}
                style={{ width: 15, height: 15, accentColor: '#1e3a5f', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(200,210,230,0.85)' }}>
                Salvar como meu método padrão
              </span>
            </label>

            <button
              onClick={startActualTimer}
              style={{ width: '100%', background: '#1e3a5f', color: '#fff', padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
            >
              <Play fill="currentColor" size={18} /> Começar a Estudar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(200,210,230,0.6)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Sessão em andamento: {timerMode === 'pomodoro' ? 'Pomodoro' : 'Modo Livre'}
            </div>

            <div style={{ fontSize: 'clamp(72px, 18vw, 160px)', fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: 'var(--pl-mono)', letterSpacing: '-0.04em', textShadow: '0 0 40px rgba(37,99,235,0.2)' }}>
              {formatHHMMSS(timerValue)}
            </div>

            <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 24 }}>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                style={{ width: 76, height: 76, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', boxShadow: '0 0 28px rgba(255,255,255,0.12)', transition: 'transform 0.15s' }}
              >
                {isTimerRunning
                  ? <Pause size={32} fill="currentColor" />
                  : <Play size={32} fill="currentColor" style={{ marginLeft: 4 }} />
                }
              </button>
              <button
                onClick={handleStopTimer}
                style={{ width: 76, height: 76, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 28px rgba(239,68,68,0.3)', transition: 'transform 0.15s' }}
              >
                <Square size={26} fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
