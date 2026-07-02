// ─── ImportConfirmModal — design 2b (Light + Dark) ───────────────────────────
//
// Modal de confirmação "Adicionar aos estudos". Substituiu o antigo
// ImportContestModal (header navy) em ConcursoDetalhe.jsx.
//
// Props:
//   contest      — objeto do concurso (nome, banca, area, cargo)
//   roles        — cargos do concurso; quando >1, mostra checkboxes de seleção
//   activeRoleId — id do cargo já selecionado na tela (vem pré-marcado)
//   groupName    — nome do concurso agrupado (título quando multi-cargo)
//   onConfirm    — fn(selectedRoleIds?) ao confirmar; recebe array de ids no modo multi
//   onCancel     — fn chamada ao clicar "Cancelar" / no overlay
//   loading      — boolean (desativa botões e mostra estado de carregamento)
//   dark         — boolean (tema escuro)

import React, { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, Layers, ChevronDown } from 'lucide-react';

const normSubject = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function ImportConfirmModal({
  contest,
  roles = [],
  activeRoleId = '',
  groupName = '',
  loadRoleSubjects,
  onConfirm,
  onCancel,
  loading = false,
  dark = false,
}) {
  const multi = Array.isArray(roles) && roles.length > 1;
  const [selected, setSelected] = useState(() => {
    const initial = activeRoleId || roles?.[0]?.id;
    return new Set(initial ? [initial] : []);
  });
  // Disciplinas por cargo (carregadas sob demanda) para medir a sobreposição.
  // Guardamos { key: nome normalizado (comparação), label: nome original (exibição) }.
  const [subjectsByRole, setSubjectsByRole] = useState({});
  const [compatLoading, setCompatLoading] = useState(false);
  const [showCompatDetail, setShowCompatDetail] = useState(false);

  const selectedKey = Array.from(selected).sort().join('|');

  useEffect(() => {
    if (!multi || typeof loadRoleSubjects !== 'function') return;
    const chosen = roles.filter((role) => selected.has(role.id));
    if (chosen.length < 2) return;
    const missing = chosen.filter((role) => !subjectsByRole[role.id]);
    if (missing.length === 0) return;

    let cancelled = false;
    setCompatLoading(true);
    Promise.all(
      missing.map(async (role) => {
        const disc = await loadRoleSubjects(role);
        const byKey = new Map();
        (Array.isArray(disc) ? disc : []).forEach((d) => {
          const label = String(typeof d === 'string' ? d : d?.nome || '').trim();
          const key = normSubject(label);
          if (key && !byKey.has(key)) byKey.set(key, label);
        });
        return [role.id, Array.from(byKey, ([key, label]) => ({ key, label }))];
      })
    ).then((pairs) => {
      if (cancelled) return;
      setSubjectsByRole((prev) => {
        const next = { ...prev };
        pairs.forEach(([id, list]) => { next[id] = list; });
        return next;
      });
      setCompatLoading(false);
    }).catch(() => { if (!cancelled) setCompatLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, selectedKey, loadRoleSubjects]);

  const compat = useMemo(() => {
    if (!multi) return null;
    const chosen = roles.filter((role) => selected.has(role.id));
    if (chosen.length < 2) return null;
    if (!chosen.every((role) => Array.isArray(subjectsByRole[role.id]))) return null;

    const sets = chosen.map((role) => new Set(subjectsByRole[role.id].map((s) => s.key)));
    // Rótulo por chave (primeiro cargo que a define) para exibição.
    const labelByKey = new Map();
    chosen.forEach((role) => subjectsByRole[role.id].forEach((s) => {
      if (!labelByKey.has(s.key)) labelByKey.set(s.key, s.label);
    }));

    const union = new Set();
    sets.forEach((set) => set.forEach((key) => union.add(key)));
    if (union.size === 0) return null;

    const shared = [];
    union.forEach((key) => { if (sets.every((set) => set.has(key))) shared.push(labelByKey.get(key)); });

    const perRole = chosen.map((role, index) => {
      const own = subjectsByRole[role.id];
      const others = sets.filter((_, i) => i !== index);
      const only = own
        .filter((s) => others.every((set) => !set.has(s.key)))
        .map((s) => s.label);
      return { role, only };
    });

    return {
      shared: shared.sort((a, b) => a.localeCompare(b, 'pt-BR')),
      total: union.size,
      pct: Math.round((shared.length / union.size) * 100),
      perRole,
    };
  }, [multi, selectedKey, subjectsByRole, roles]);

  if (!contest) return null;

  const toggleRole = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roleDiscCount = (role) =>
    Number(role?.sourceTemplate?.subjects_count ?? (role?.disciplinas?.length || 0)) || 0;

  const selectedCount = multi ? selected.size : 1;
  const confirmDisabled = loading || (multi && selectedCount === 0);
  const confirmLabel = multi
    ? selectedCount > 1
      ? `Adicionar ${selectedCount} cargos`
      : 'Adicionar cargo'
    : 'Adicionar agora';

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
            {multi ? (groupName || contest.nome || contest.concurso) : (contest.nome || contest.concurso)}
          </h2>
          {!multi && contest.cargo && contest.cargo !== contest.nome && (
            <p style={{ fontSize: 12, color: t.subtitle, marginBottom: 4 }}>{contest.cargo}</p>
          )}
          <p style={{ fontSize: 12.5, color: t.subtitle, lineHeight: 1.5 }}>
            {multi
              ? 'Escolha os cargos que quer estudar. Eles entram num plano único e as matérias iguais são somadas — sem estudar nada duas vezes.'
              : 'Isso cria um curso com disciplinas, tópicos e dados do edital.'}
          </p>
        </div>

        {/* Seleção de cargos (concurso agrupado) */}
        {multi && (
          <div style={{ padding: '0 24px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roles.map((role) => {
              const checked = selected.has(role.id);
              const disc = roleDiscCount(role);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => !loading && toggleRole(role.id)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    textAlign: 'left', padding: '11px 13px', borderRadius: 12,
                    border: `1.5px solid ${checked ? t.chipDot2 : t.chipBorder}`,
                    background: t.chipBg,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: checked ? 'none' : `1.5px solid ${t.chipBorder}`,
                    background: checked ? t.chipDot2 : 'transparent',
                  }}>
                    {checked ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: t.chipInk, lineHeight: 1.25 }}>
                      {role.nome}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.subtitle, marginTop: 2 }}>
                      {[role.vagas ? `${role.vagas} vagas` : null, disc ? `${disc} disciplinas` : null].filter(Boolean).join(' · ') || 'Detalhes no edital'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Compatibilidade entre os cargos selecionados */}
        {multi && selectedCount >= 2 && (
          <div style={{ padding: '0 24px 14px' }}>
            <div style={{
              borderRadius: 12, border: `1px solid ${t.chipBorder}`, background: t.chipBg,
              padding: '12px 14px',
            }}>
              {(() => {
                const compatColor = compat
                  ? (compat.pct >= 58 ? '#15803d' : compat.pct >= 32 ? '#b45309' : t.chipDot2)
                  : t.chipDot2;
                const header = (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <Layers size={14} color={compatColor} />
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: t.chipInk }}>
                      Compatibilidade dos cargos
                    </span>
                    {compat && (
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: compatColor }}>{compat.pct}%</span>
                        <ChevronDown size={15} color={t.subtitle} style={{ transform: showCompatDetail ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
                      </span>
                    )}
                  </div>
                );

                if (compatLoading && !compat) {
                  return (
                    <p style={{ fontSize: 12, color: t.subtitle, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <Loader2 size={13} className="animate-spin" /> Calculando matérias em comum…
                    </p>
                  );
                }
                if (!compat) {
                  return (
                    <>
                      <div style={{ marginBottom: 0 }}>{header}</div>
                      <p style={{ fontSize: 12, color: t.subtitle, margin: '10px 0 0' }}>
                        Selecione 2+ cargos para ver a sobreposição de matérias.
                      </p>
                    </>
                  );
                }
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCompatDetail((v) => !v)}
                      aria-expanded={showCompatDetail}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', marginBottom: 10 }}
                    >
                      {header}
                    </button>
                    <div style={{ height: 6, borderRadius: 999, background: t.divider, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${compat.pct}%`, borderRadius: 999, background: compatColor, transition: 'width .3s ease' }} />
                    </div>
                    <p style={{ fontSize: 12, color: t.noteInk, lineHeight: 1.5, margin: 0 }}>
                      <strong style={{ color: t.noteStrong }}>{compat.shared.length}</strong> de {compat.total} matérias em comum — estudadas uma vez só no plano combinado.{' '}
                      <button type="button" onClick={() => setShowCompatDetail((v) => !v)} style={{ background: 'transparent', border: 0, padding: 0, color: t.chipDot2, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {showCompatDetail ? 'ocultar detalhes' : 'ver detalhes'}
                      </button>
                    </p>

                    {showCompatDetail && (
                      <div style={{ marginTop: 12, borderTop: `1px solid ${t.divider}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 220, overflowY: 'auto' }}>
                        <CompatGroup
                          title={`Em comum (${compat.shared.length})`}
                          dotColor="#15803d"
                          subjects={compat.shared}
                          t={t}
                          emptyText="Nenhuma matéria em comum."
                        />
                        {compat.perRole.map(({ role, only }) => (
                          <CompatGroup
                            key={role.id}
                            title={`Só em ${role.nome} (${only.length})`}
                            dotColor={t.chipDot2}
                            subjects={only.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'))}
                            t={t}
                            emptyText="Todas as matérias deste cargo também aparecem nos outros."
                          />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Chips de meta */}
        {!multi && (contest.banca || contest.area) && (
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
            {multi ? (
              <>Vira <strong style={{ color: t.noteStrong }}>um plano só</strong> em Meus cursos, com o edital combinado dos cargos escolhidos.</>
            ) : (
              <>Depois de adicionar, encontre em <strong style={{ color: t.noteStrong }}>Meus cursos</strong> e estude pelo edital verticalizado.</>
            )}
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
            onClick={() => onConfirm?.(multi ? Array.from(selected) : undefined)}
            disabled={confirmDisabled}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: t.ctaInk, background: t.ctaBg,
              border: 0, borderRadius: 10, padding: '10px 18px',
              cursor: confirmDisabled ? 'not-allowed' : 'pointer', opacity: confirmDisabled ? 0.5 : 1,
            }}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Adicionando…</>
            ) : (
              <>
                {confirmLabel}
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

// Lista de matérias de um grupo (em comum / exclusivas de um cargo) no detalhe.
function CompatGroup({ title, subjects = [], dotColor, t, emptyText }) {
  return (
    <div>
      <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: t.subtitle, margin: '0 0 7px' }}>
        {title}
      </p>
      {subjects.length === 0 ? (
        <p style={{ fontSize: 11.5, color: t.subtitle, margin: 0, fontStyle: 'italic' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {subjects.map((name, i) => (
            <span key={`${name}-${i}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 600, color: t.chipInk,
              background: t.bg, border: `1px solid ${t.chipBorder}`,
              borderRadius: 8, padding: '4px 9px', lineHeight: 1.2,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'block', flexShrink: 0 }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
