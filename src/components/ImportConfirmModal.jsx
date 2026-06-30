// ─── ImportConfirmModal — design 2b (Light + Dark) ───────────────────────────
//
// Modal de confirmação "Adicionar aos estudos". Substituiu o antigo
// ImportContestModal (header navy) em ConcursoDetalhe.jsx.
//
// Props:
//   contest   — objeto do concurso (nome, banca, area, cargo)
//   onConfirm — fn chamada ao clicar "Adicionar agora"
//   onCancel  — fn chamada ao clicar "Cancelar" / no overlay
//   loading   — boolean (desativa botões e mostra estado de carregamento)
//   dark      — boolean (tema escuro)

import React from 'react';
import { Loader2 } from 'lucide-react';

export function ImportConfirmModal({ contest, onConfirm, onCancel, loading = false, dark = false }) {
  if (!contest) return null;

  // ── Tokens light / dark ───────────────────────────────────────────────────
  const t = dark
    ? {
        overlay:     'rgba(0,0,0,0.6)',
        bg:          '#201e1a',
        border:      'rgba(243,239,229,0.10)',
        shadow:      '0 10px 20px rgba(0,0,0,0.30), 0 24px 48px rgba(0,0,0,0.40)',
        bar:         'linear-gradient(90deg, #4a7ab5 0%, #6898d4 100%)',
        eyebrow:     '#6898d4',
        title:       '#f0ebe0',
        subtitle:    '#756d60',
        chipBg:      'rgba(243,239,229,0.06)',
        chipBorder:  'rgba(243,239,229,0.12)',
        chipInk:     '#ccc6b8',
        chipDot1:    '#756d60',
        chipDot2:    '#6898d4',
        divider:     'rgba(243,239,229,0.08)',
        noteInk:     '#756d60',
        noteStrong:  '#ccc6b8',
        cancelInk:   '#756d60',
        ctaBg:       '#f0ebe0',
        ctaInk:      '#14110d',
      }
    : {
        overlay:     'rgba(20,17,13,0.45)',
        bg:          '#f3efe5',
        border:      'rgba(20,17,13,0.12)',
        shadow:      '0 10px 20px rgba(20,17,13,0.08), 0 24px 48px rgba(20,17,13,0.14)',
        bar:         'linear-gradient(90deg, #1e3a5f 0%, #2a4d76 100%)',
        eyebrow:     '#1e3a5f',
        title:       '#14110d',
        subtitle:    '#847b6c',
        chipBg:      '#ffffff',
        chipBorder:  'rgba(20,17,13,0.18)',
        chipInk:     '#3a342c',
        chipDot1:    '#847b6c',
        chipDot2:    '#1e3a5f',
        divider:     'rgba(20,17,13,0.10)',
        noteInk:     '#847b6c',
        noteStrong:  '#3a342c',
        cancelInk:   '#847b6c',
        ctaBg:       '#14110d',
        ctaInk:      '#f3efe5',
      };

  return (
    // Overlay
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: t.overlay, padding: 16,
      }}
    >
      {/* Card — stop propagation para clicks dentro nao fecharem o modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          boxShadow: t.shadow,
          overflow: 'hidden',
        }}
      >
        {/* Barra de acento */}
        <div style={{ height: 3, background: t.bar }} />

        {/* Header */}
        <div style={{ padding: '22px 24px 14px' }}>
          <p style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '.18em',
            textTransform: 'uppercase', color: t.eyebrow, marginBottom: 10,
          }}>
            Adicionar aos estudos
          </p>
          <h2 style={{
            fontSize: 21, fontWeight: 800, color: t.title,
            lineHeight: 1.15, marginBottom: 6, letterSpacing: '-0.02em',
          }}>
            {contest.nome || contest.concurso}
          </h2>
          {contest.cargo && contest.cargo !== contest.nome && (
            <p style={{ fontSize: 12, color: t.subtitle, marginBottom: 4 }}>{contest.cargo}</p>
          )}
          <p style={{ fontSize: 12.5, color: t.subtitle, lineHeight: 1.5 }}>
            Isso cria um curso com disciplinas, tópicos e dados do edital.
          </p>
        </div>

        {/* Chips de meta */}
        {(contest.banca || contest.area) && (
          <div style={{ padding: '0 24px 14px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {contest.banca && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: t.chipInk,
                background: t.chipBg, border: `1px solid ${t.chipBorder}`,
                borderRadius: 20, padding: '4px 12px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 2, background: t.chipDot1, display: 'block', flexShrink: 0 }} />
                {contest.banca}
              </span>
            )}
            {contest.area && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: t.chipInk,
                background: t.chipBg, border: `1px solid ${t.chipBorder}`,
                borderRadius: 20, padding: '4px 12px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 2, background: t.chipDot2, display: 'block', flexShrink: 0 }} />
                {contest.area}
              </span>
            )}
          </div>
        )}

        {/* Divider + nota */}
        <div style={{ margin: '0 24px', borderTop: `1px solid ${t.divider}` }} />
        <div style={{ padding: '12px 24px' }}>
          <p style={{ fontSize: 12, color: t.noteInk, lineHeight: 1.6 }}>
            Depois de adicionar, encontre em{' '}
            <strong style={{ color: t.noteStrong }}>Meus cursos</strong>{' '}
            e estude pelo edital verticalizado.
          </p>
        </div>

        {/* Footer: ações */}
        <div style={{ padding: '4px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              fontSize: 13, fontWeight: 700, color: t.cancelInk,
              background: 'transparent', border: 0, padding: '8px 14px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: t.ctaInk, background: t.ctaBg,
              border: 0, borderRadius: 10, padding: '10px 18px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Adicionando…</>
            ) : (
              <>
                Adicionar agora
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
